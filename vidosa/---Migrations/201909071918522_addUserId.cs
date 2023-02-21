namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addUserId : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.AspNetUsers", "UserId", c => c.Int(nullable: false));
        }
        
        public override void Down()
        {
            DropColumn("dbo.AspNetUsers", "UserId");
        }
    }
}
