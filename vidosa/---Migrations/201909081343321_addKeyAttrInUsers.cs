namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addKeyAttrInUsers : DbMigration
    {
        public override void Up()
        {
            AlterColumn("dbo.AspNetUsers", "UserId", c => c.Int(nullable: false));
        }
        
        public override void Down()
        {
            AlterColumn("dbo.AspNetUsers", "UserId", c => c.Int(nullable: false, identity: true));
        }
    }
}
