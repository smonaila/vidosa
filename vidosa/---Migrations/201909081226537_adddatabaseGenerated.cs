namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class adddatabaseGenerated : DbMigration
    {
        public override void Up()
        {
            AlterColumn("dbo.AspNetUsers", "UserId", c => c.Int(nullable: false, identity: true));
        }
        
        public override void Down()
        {
            AlterColumn("dbo.AspNetUsers", "UserId", c => c.Int(nullable: false));
        }
    }
}
